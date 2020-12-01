import React, {useState, useEffect} from "react";


function CategoriesTab( {categories, activeColor, onChangeCategory} ) {
    const [activeCategory, setActiveCategory] = useState(categories[0]);

    return(
        <div>
            {categories.map((category) => <button className={'userPageCategoriesTab'} 
                                            key={category}
                                            style={{color: (activeCategory === category?activeColor:'#000000')}}
                                            onClick={()=>{ 
                                                setActiveCategory(category);
                                                onChangeCategory(category);
                                            }}>
                                            {category}
                                        </button>) }
            <br/>
`           <hr style={{ color: activeColor, backgroundColor: '#6C0AAB', height: 2.5,  borderColor : '#6C0AAB', marginTop: "-16px", marginBottom: "-10px" }}/>`
        </div>  
    )
}

export default CategoriesTab;
